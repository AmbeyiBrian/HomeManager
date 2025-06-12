# Git Versioning Guide for HomeManager

This guide explains how to manage the Git repository for the HomeManager project, which consists of three main components: frontend, mobile, and backend.

## Repository Structure

The HomeManager project uses a monorepo structure, which means all three components are stored in a single Git repository:

- `frontend/` - React.js web application
- `mobile/` - React Native mobile application
- `homemanager_backend/` - Django backend server

## Basic Git Commands

### Pulling Latest Changes

Always pull the latest changes before starting work:

```bash
git pull origin master
```

### Committing Changes

1. Check status of changes:
```bash
git status
```

2. Add files to staging:
```bash
git add .                    # Add all changes
git add path/to/specific/file  # Add specific file
```

3. Commit changes:
```bash
git commit -m "Descriptive message about changes"
```

4. Push to GitHub:
```bash
git push origin master
```

## Branching Strategy

### Creating a New Branch

For new features or bug fixes, create a dedicated branch:

```bash
git checkout -b feature/new-feature-name
```

### Switching Between Branches

```bash
git checkout branch-name
```

### Merging a Branch

Once your feature is complete:

1. Switch to the destination branch:
```bash
git checkout master
```

2. Merge your feature branch:
```bash
git merge feature/new-feature-name
```

3. Push changes to GitHub:
```bash
git push origin master
```

## Handling Component-Specific Changes

Although all components are in one repository, you can make changes to specific components:

### Frontend-only Changes

```bash
git add frontend/
git commit -m "Frontend: Description of changes"
git push origin master
```

### Mobile-only Changes

```bash
git add mobile/
git commit -m "Mobile: Description of changes"
git push origin master
```

### Backend-only Changes

```bash
git add homemanager_backend/
git commit -m "Backend: Description of changes"
git push origin master
```

## Resolving Conflicts

If you encounter merge conflicts:

1. Identify the conflicting files:
```bash
git status
```

2. Open the conflicting files and resolve the conflicts manually (look for the `<<<<<<<`, `=======`, and `>>>>>>>` markers)

3. After resolving, add the fixed files:
```bash
git add path/to/resolved/file
```

4. Complete the merge:
```bash
git commit -m "Resolved conflicts in [file names]"
```

## Best Practices

1. **Commit Messages**: Use clear, descriptive commit messages, preferably starting with the component name (e.g., "Frontend:", "Mobile:", "Backend:").

2. **Regular Commits**: Make small, regular commits rather than large, infrequent ones.

3. **Pull Before Push**: Always pull changes before pushing to avoid conflicts.

4. **Branch Naming**: Use descriptive branch names with prefixes like `feature/`, `bugfix/`, or `hotfix/`.

5. **Keep Components Independent**: Try to minimize changes that affect multiple components simultaneously.

## Quick Reference

```bash
# Check repository status
git status

# Pull latest changes
git pull origin master

# Create a new branch
git checkout -b feature/new-feature

# Add all changes
git add .

# Commit changes
git commit -m "Description of changes"

# Push to GitHub
git push origin master

# View commit history
git log --oneline
```

## GitHub Repository

The HomeManager project is hosted on GitHub at:
https://github.com/AmbeyiBrian/HomeManager.git

## Tips for Managing the Monorepo

- When updating dependencies in one component, ensure it doesn't break other components
- Consider using tags for releases that involve all components
- Use meaningful commit messages that clearly indicate which component(s) were modified
