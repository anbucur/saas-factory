import { useState, useEffect, useMemo } from 'react';
import type { ProjectDetail } from '../../types';
import { api } from '../../lib/api';
import { Folder, File, FolderOpen, ChevronRight, ChevronDown, Code, FileText, X, Copy, Check, Download } from 'lucide-react';

interface Props {
  project: ProjectDetail;
}

interface FileEntry {
  path: string;
  type: string;
  size: number;
}

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
  file?: FileEntry;
}

const FILE_ICONS: Record<string, string> = {
  ts: 'text-blue-400',
  tsx: 'text-cyan-400',
  js: 'text-yellow-400',
  jsx: 'text-yellow-400',
  json: 'text-amber-400',
  css: 'text-pink-400',
  html: 'text-orange-400',
  md: 'text-zinc-400',
  yml: 'text-purple-400',
  yaml: 'text-purple-400',
  dockerfile: 'text-blue-400',
  env: 'text-green-400',
  sql: 'text-emerald-400',
  py: 'text-green-400',
  sh: 'text-amber-400',
};

function buildTree(files: FileEntry[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isLast = i === parts.length - 1;
      const existing = current.find(n => n.name === name);

      if (existing) {
        if (isLast) {
          existing.file = file;
        } else {
          current = existing.children;
        }
      } else {
        const node: TreeNode = {
          name,
          path: parts.slice(0, i + 1).join('/'),
          isDir: !isLast,
          children: [],
          file: isLast ? file : undefined,
        };
        current.push(node);
        if (!isLast) {
          current = node.children;
        }
      }
    }
  }

  // Sort: directories first, then files, alphabetically
  function sortTree(nodes: TreeNode[]): TreeNode[] {
    return nodes.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    }).map(n => ({ ...n, children: sortTree(n.children) }));
  }

  return sortTree(root);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function TreeItem({ node, depth, selectedFile, onSelect }: {
  node: TreeNode;
  depth: number;
  selectedFile: string | null;
  onSelect: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const isSelected = selectedFile === node.path;

  if (node.isDir) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-1.5 py-1 px-2 hover:bg-zinc-800/50 rounded text-left"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {expanded ? (
            <ChevronDown className="w-3 h-3 text-zinc-500 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 text-zinc-500 flex-shrink-0" />
          )}
          {expanded ? (
            <FolderOpen className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          ) : (
            <Folder className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          )}
          <span className="text-xs text-zinc-300 truncate">{node.name}</span>
        </button>
        {expanded && node.children.map(child => (
          <TreeItem
            key={child.path}
            node={child}
            depth={depth + 1}
            selectedFile={selectedFile}
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  }

  const ext = node.name.split('.').pop()?.toLowerCase() || '';
  const colorClass = FILE_ICONS[ext] || 'text-zinc-400';

  return (
    <button
      onClick={() => onSelect(node.path)}
      className={`w-full flex items-center gap-1.5 py-1 px-2 rounded text-left ${
        isSelected ? 'bg-blue-500/10 text-blue-400' : 'hover:bg-zinc-800/50'
      }`}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
    >
      <span className="w-3 h-3 flex-shrink-0" />
      <File className={`w-3.5 h-3.5 flex-shrink-0 ${colorClass}`} />
      <span className={`text-xs truncate ${isSelected ? 'text-blue-400' : 'text-zinc-400'}`}>{node.name}</span>
      {node.file && (
        <span className="text-[9px] text-zinc-600 ml-auto flex-shrink-0">{formatSize(node.file.size)}</span>
      )}
    </button>
  );
}

export function FileBrowser({ project }: Props) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirExists, setDirExists] = useState(false);
  const [totalSize, setTotalSize] = useState(0);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadFiles();
  }, [project.id]);

  async function loadFiles() {
    try {
      setLoading(true);
      const data = await api.getProjectFiles(project.id);
      setFiles(data.files);
      setDirExists(data.exists);
      setTotalSize(data.totalSize);
    } catch (err) {
      console.error('Failed to load files:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(filePath: string) {
    setSelectedFile(filePath);
    setLoadingContent(true);
    try {
      const data = await api.getFileContent(project.id, filePath);
      setFileContent(data.content);
    } catch (err) {
      setFileContent('// Failed to load file content');
    } finally {
      setLoadingContent(false);
    }
  }

  function handleCopy() {
    if (!fileContent) return;
    navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const tree = useMemo(() => buildTree(files), [files]);

  // Count files by extension
  const fileStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of files) {
      counts[f.type] = (counts[f.type] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [files]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!dirExists || files.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-center p-8">
        <div>
          <Code className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-300 mb-2">No generated files</h3>
          <p className="text-sm text-zinc-500">
            Generated code will appear here once a coding agent (Claude Code) writes files during the development phase
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* File tree sidebar */}
      <div className="w-72 border-r border-zinc-800 overflow-auto">
        <div className="p-3">
          <div className="flex items-center justify-between mb-2 px-2">
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Files ({files.length})
            </h3>
            <span className="text-[10px] text-zinc-600">{formatSize(totalSize)}</span>
          </div>

          {/* File type badges */}
          <div className="flex flex-wrap gap-1 mb-3 px-2">
            {fileStats.slice(0, 6).map(([ext, count]) => (
              <span key={ext} className={`text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 ${FILE_ICONS[ext] || 'text-zinc-500'}`}>
                .{ext} ({count})
              </span>
            ))}
          </div>

          {/* Tree */}
          <div>
            {tree.map(node => (
              <TreeItem
                key={node.path}
                node={node}
                depth={0}
                selectedFile={selectedFile}
                onSelect={handleSelect}
              />
            ))}
          </div>
        </div>
      </div>

      {/* File content viewer */}
      <div className="flex-1 overflow-auto">
        {selectedFile ? (
          <>
            <div className="sticky top-0 flex items-center justify-between px-6 py-3 bg-zinc-950 border-b border-zinc-800 z-10">
              <div className="flex items-center gap-2 min-w-0">
                <File className={`w-3.5 h-3.5 flex-shrink-0 ${FILE_ICONS[selectedFile.split('.').pop()?.toLowerCase() || ''] || 'text-zinc-400'}`} />
                <span className="text-xs text-zinc-300 truncate">{selectedFile}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  title="Copy"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => { setSelectedFile(null); setFileContent(null); }}
                  className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              {loadingContent ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                </div>
              ) : (
                <pre className="text-sm text-zinc-300 whitespace-pre font-mono leading-relaxed bg-zinc-900 p-4 rounded-lg border border-zinc-800 overflow-x-auto">
                  {fileContent}
                </pre>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
            Select a file to view its content
          </div>
        )}
      </div>
    </div>
  );
}
