// Single entry point for the SaaS Factory Temporal workflow package.
// The worker bundles this file to discover workflows; activities are registered
// separately in apps/factory-backend/src/worker.ts.
export { buildSaaSProject, pauseSignal, resumeSignal } from './workflows-v2.js'
export * from './activities.js'
