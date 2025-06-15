/**
 * REDIRECTOR FOR MODULAR AUTH CONTEXT
 * 
 * This file now forwards imports to the modular version in the /auth directory.
 * This maintains backward compatibility with existing imports throughout the codebase.
 * 
 * The original monolithic implementation has been refactored into multiple files
 * organized by feature area for better maintainability.
 * 
 * See mobile/context/auth/README.md for details on the new structure.
 * 
 * Original file has been backed up as AuthContext.original.js
 */

// Re-export everything from the modular version
export * from './auth';
