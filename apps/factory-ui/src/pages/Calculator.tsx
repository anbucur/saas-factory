import { useState, useCallback } from 'react';
import { Divide, X, Minus, Plus, Equal, Percent, Dot } from 'lucide-react';

const GlassFilter = () => (
  <svg className="hidden">
    <defs>
      <filter id="glass-distortion" x="0%" y="0%" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.01 0.02" numOctaves="1" seed="17" result="turbulence" />
        <feComponentTransfer in="turbulence" result="mapped">
          <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
          <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
          <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
        </feComponentTransfer>
        <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
        <feDisplacementMap in="SourceGraphic" in2="softMap" scale="20" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </defs>
  </svg>
);

interface CalcButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'number' | 'operator' | 'function' | 'equals';
  className?: string;
}

const CalcButton = ({ children, onClick, variant = 'number', className = '' }: CalcButtonProps) => {
  const baseStyles = "relative flex items-center justify-center font-semibold text-xl transition-all duration-300 active:scale-95 overflow-hidden rounded-2xl";
  
  const variantStyles = {
    number: "bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm border border-white/10",
    operator: "bg-gradient-to-br from-violet-500/30 to-purple-600/30 hover:from-violet-500/50 hover:to-purple-600/50 text-white backdrop-blur-sm border border-violet-400/30",
    function: "bg-gradient-to-br from-zinc-600/30 to-zinc-700/30 hover:from-zinc-500/40 hover:to-zinc-600/40 text-white backdrop-blur-sm border border-zinc-400/20",
    equals: "bg-gradient-to-br from-emerald-500/40 to-teal-500/40 hover:from-emerald-500/60 hover:to-teal-500/60 text-white backdrop-blur-sm border border-emerald-400/30 shadow-lg shadow-emerald-500/20",
  };

  return (
    <button
      onClick={onClick}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
      <div className="absolute inset-0 rounded-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] pointer-events-none" />
      <span className="relative z-10">{children}</span>
    </button>
  );
};

export function Calculator() {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputDigit = useCallback((digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  }, [display, waitingForOperand]);

  const inputDot = useCallback(() => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  }, [display, waitingForOperand]);

  const clear = useCallback(() => {
    setDisplay('0');
    setPreviousValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  }, []);

  const clearEntry = useCallback(() => {
    setDisplay('0');
  }, []);

  const toggleSign = useCallback(() => {
    setDisplay(display.charAt(0) === '-' ? display.slice(1) : '-' + display);
  }, [display]);

  const inputPercent = useCallback(() => {
    const value = parseFloat(display);
    setDisplay(String(value / 100));
  }, [display]);

  const performOperation = useCallback((nextOperator: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operator) {
      const currentValue = previousValue;
      let newValue = currentValue;

      switch (operator) {
        case '+':
          newValue = currentValue + inputValue;
          break;
        case '-':
          newValue = currentValue - inputValue;
          break;
        case '×':
          newValue = currentValue * inputValue;
          break;
        case '÷':
          newValue = currentValue / inputValue;
          break;
      }

      setDisplay(String(newValue));
      setPreviousValue(newValue);
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
  }, [display, operator, previousValue]);

  const calculate = useCallback(() => {
    if (!operator || previousValue === null) return;

    const inputValue = parseFloat(display);
    let newValue = previousValue;

    switch (operator) {
      case '+':
        newValue = previousValue + inputValue;
        break;
      case '-':
        newValue = previousValue - inputValue;
        break;
      case '×':
        newValue = previousValue * inputValue;
        break;
      case '÷':
        newValue = previousValue / inputValue;
        break;
    }

    setDisplay(String(newValue));
    setPreviousValue(null);
    setOperator(null);
    setWaitingForOperand(true);
  }, [display, operator, previousValue]);

  const formatDisplay = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    if (value.length > 12) {
      return num.toExponential(6);
    }
    return value;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <GlassFilter />
      
      <div className="w-full max-w-sm">
        <div className="relative rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-purple-500/10 rounded-3xl" />
          <div className="absolute inset-0 backdrop-blur-xl bg-black/40 rounded-3xl border border-white/10 shadow-2xl" />
          
          <div className="relative p-6">
            <div className="text-center mb-2">
              <span className="text-xs font-medium text-zinc-500 tracking-widest uppercase">Ultramodern</span>
            </div>
            
            <div className="mb-6">
              <div className="text-right text-zinc-500 text-sm h-6 mb-1 font-mono">
                {previousValue !== null && operator && (
                  <span>{previousValue} {operator}</span>
                )}
              </div>
              <div className="relative rounded-2xl overflow-hidden bg-black/30 border border-white/5">
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                <div className="p-4">
                  <div className="text-right text-5xl font-light text-white font-mono tracking-tight">
                    {formatDisplay(display)}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <CalcButton variant="function" onClick={clear}>AC</CalcButton>
              <CalcButton variant="function" onClick={clearEntry}>C</CalcButton>
              <CalcButton variant="function" onClick={toggleSign}>±</CalcButton>
              <CalcButton variant="operator" onClick={() => performOperation('÷')}>
                <Divide className="w-5 h-5" />
              </CalcButton>

              <CalcButton onClick={() => inputDigit('7')}>7</CalcButton>
              <CalcButton onClick={() => inputDigit('8')}>8</CalcButton>
              <CalcButton onClick={() => inputDigit('9')}>9</CalcButton>
              <CalcButton variant="operator" onClick={() => performOperation('×')}>
                <X className="w-5 h-5" />
              </CalcButton>

              <CalcButton onClick={() => inputDigit('4')}>4</CalcButton>
              <CalcButton onClick={() => inputDigit('5')}>5</CalcButton>
              <CalcButton onClick={() => inputDigit('6')}>6</CalcButton>
              <CalcButton variant="operator" onClick={() => performOperation('-')}>
                <Minus className="w-5 h-5" />
              </CalcButton>

              <CalcButton onClick={() => inputDigit('1')}>1</CalcButton>
              <CalcButton onClick={() => inputDigit('2')}>2</CalcButton>
              <CalcButton onClick={() => inputDigit('3')}>3</CalcButton>
              <CalcButton variant="operator" onClick={() => performOperation('+')}>
                <Plus className="w-5 h-5" />
              </CalcButton>

              <CalcButton onClick={inputPercent}>
                <Percent className="w-5 h-5" />
              </CalcButton>
              <CalcButton onClick={() => inputDigit('0')}>0</CalcButton>
              <CalcButton onClick={inputDot}>
                <Dot className="w-5 h-5" />
              </CalcButton>
              <CalcButton variant="equals" onClick={calculate}>
                <Equal className="w-5 h-5" />
              </CalcButton>
            </div>

            <div className="mt-6 flex justify-center">
              <div className="w-32 h-1 rounded-full bg-white/20" />
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            Calculator
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Powered by 21st.dev</p>
        </div>
      </div>
    </div>
  );
}
