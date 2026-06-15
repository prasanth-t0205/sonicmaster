# Contributing to SonicMaster

First off, thank you for considering contributing to SonicMaster!

**🚨 IMPORTANT: BUG-FIXES ONLY POLICY 🚨**
SonicMaster is currently in its v1.0.0 launch phase. To maintain our strict, premium UI/UX design standards and ensure absolute core stability, we are currently operating under a **Bug-Fixes Only** contribution model.

- **We DO accept:** Pull requests that fix verifiable crashes, logic bugs, performance issues, or typos.
- **We DO NOT accept:** Pull requests that introduce new features, change the UI/UX design, alter the color palette, or add new dependencies. Please do not submit feature requests or feature PRs, as they will be politely closed.

This document serves as a comprehensive guide to help you navigate the process of contributing bug fixes to this project.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
   - [Prerequisites](#prerequisites)
   - [Local Development Setup](#local-development-setup)
3. [Development Workflow](#development-workflow)
   - [Branching Strategy](#branching-strategy)
   - [Making Changes](#making-changes)
   - [Commit Guidelines](#commit-guidelines)
4. [Pull Request Process](#pull-request-process)
5. [Reporting Bugs](#reporting-bugs)

## Code of Conduct

By participating in this project, you are expected to uphold our [Code of Conduct](CODE_OF_CONDUCT.md). Please report any unacceptable behavior to the project maintainers.

## Getting Started

### Prerequisites

To build and run SonicMaster locally, you will need the following installed on your system:

- **Node.js**: Version 24.0.0 or higher. We strictly enforce this version. (Consider using `nvm` or `fnm` to manage your Node versions).
- **Git**: Version control system.
- **npm**: Node package manager (comes bundled with Node.js).

### Local Development Setup

1. **Fork the repository**: Click the "Fork" button in the top-right corner of this page to create your own copy of the repository.
2. **Clone your fork**:
   ```bash
   git clone https://github.com/<your-username>/sonicmaster.git
   cd sonicmaster
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/prasanth-t0205/sonicmaster.git
   ```
4. **Install dependencies**:

   ```bash
   npm install
   ```

   _Note: This project relies on `electron-builder` and native dependencies. If you encounter errors during installation, ensure you have Python and standard C++ build tools installed for your operating system._

5. **Start the development server**:
   ```bash
   npm run dev
   ```
   This command starts the Vite development server and launches the Electron application simultaneously.

## Development Workflow

### Branching Strategy

- `master`: The primary development branch. It should always be stable and deployable.
- Feature branches: Always create a new branch from `master` for your work.
  - Format: `feature/<short-description>` or `bugfix/<short-description>`
  - Example: `feature/dark-mode-toggle` or `bugfix/audio-glitch-fix`

### Making Changes

- **Follow the Architecture**: SonicMaster uses React, Vite, Tailwind CSS, and Electron. Familiarize yourself with the directory structure.
  - `src/`: React frontend application logic (Vite JS).
  - `components/`: Modular React components.
  - `electron/`: Main process code and IPC handlers.
- **Code Style**: We enforce strict linting and formatting.
  - The project uses `eslint` and `prettier`.
  - Do not disable linter warnings without a valid, documented reason.
  - Our Git hooks (Husky) will automatically format your code when you commit.

### Commit Guidelines

We prefer descriptive, conventional commits to maintain a clean and readable history.

- **Format**: `<type>(<scope>): <subject>`
- **Types**:
  - `feat`: A new feature
  - `fix`: A bug fix
  - `docs`: Documentation only changes
  - `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc)
  - `refactor`: A code change that neither fixes a bug nor adds a feature
  - `perf`: A code change that improves performance
  - `test`: Adding missing tests or correcting existing tests
  - `chore`: Changes to the build process or auxiliary tools

## Pull Request Process

1. **Sync with Upstream**: Before submitting a PR, fetch the latest changes from the `master` branch of the upstream repository and merge them into your branch to resolve any conflicts.
2. **Push to your Fork**: Push your changes to your forked repository.
3. **Open a Pull Request**: Navigate to the original SonicMaster repository and click "New Pull Request".
4. **Fill out the Template**: We have a strict PR template. Please fill it out completely, detailing exactly what your PR does and how you tested it.
5. **Pass CI Checks**: Your PR will automatically trigger our GitHub Actions pipeline. It must pass all linting, formatting, and build checks before it can be reviewed.
6. **Code Review**: A maintainer will review your code. Be prepared to engage in discussion and make requested changes.

## Reporting Bugs

If you find a bug, please help us by reporting it using the **Bug Report Template** in the Issues tab.

- Check if the bug has already been reported.
- Provide a clear, step-by-step method to reproduce the issue.
- Include your operating system and the version of SonicMaster you are using.

Thank you for helping us keep SonicMaster stable!
