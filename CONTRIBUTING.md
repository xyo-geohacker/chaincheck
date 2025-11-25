# Contributing to ChainCheck

Thank you for your interest in contributing to ChainCheck! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

Before creating a bug report, please check the [existing issues](https://github.com/YOUR_USERNAME/YOUR_REPO/issues) to see if the problem has already been reported.

When creating a bug report, please include:
- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Environment details (OS, Node.js version, etc.)
- Relevant logs or error messages

Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md) when creating an issue.

### Suggesting Features

We welcome feature suggestions! Please:
- Check existing issues to see if your idea has been discussed
- Provide a clear description of the feature
- Explain the use case and benefits
- Consider implementation complexity

Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md) when creating an issue.

### Pull Requests

1. **Fork the repository** and create your branch from `main` or `develop`
2. **Follow the coding standards** (see below)
3. **Write or update tests** for your changes
4. **Update documentation** as needed
5. **Ensure all tests pass** (`npm test` in each affected directory)
6. **Run linting** (`npm run lint` where applicable)
7. **Type check** (`npm run typecheck` or `npx tsc --noEmit`)
8. **Commit your changes** following [Conventional Commits](https://www.conventionalcommits.org/)
9. **Push to your fork** and create a Pull Request

#### Pull Request Guidelines

- Keep PRs focused on a single feature or bug fix
- Write clear, descriptive commit messages
- Reference related issues in your PR description
- Ensure CI checks pass before requesting review
- Request review from maintainers when ready

#### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Example:
```
feat(backend): add sensor data validation

Add validation for accelerometer data in delivery verification endpoint.
Includes Zod schema updates and unit tests.

Closes #123
```

## Development Setup

See [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) for detailed setup instructions.

### Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
   cd chaincheck
   ```

2. Install dependencies for each component:
   ```bash
   # Backend
   cd backend && npm install && cd ..
   
   # Web
   cd web && npm install && cd ..
   
   # Mobile
   cd mobile && npm install && cd ..
   ```

3. Set up environment variables (see `env.example` files)

4. Run tests:
   ```bash
   # Backend
   cd backend && npm test
   
   # Web
   cd web && npm test
   
   # Mobile
   cd mobile && npm test
   ```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Provide type definitions for all functions and variables
- Avoid `any` type; use `unknown` when necessary

### Code Style

- Follow existing code style and patterns
- Use meaningful variable and function names
- Keep functions focused and small
- Add comments for complex logic
- Remove commented-out code before committing

### Testing

- Write tests for new features and bug fixes
- Aim for high test coverage
- Use descriptive test names
- Test both success and error cases

### Documentation

- Update README.md for user-facing changes
- Update DEVELOPMENT_GUIDE.md for developer-facing changes
- Add JSDoc comments for public APIs
- Keep inline comments up to date

## Project Structure

- `backend/` - Express API server
- `web/` - Next.js web dashboard
- `mobile/` - Expo React Native app
- `shared/` - Shared TypeScript types
- `docs/` - Additional documentation
- `.github/` - GitHub workflows and templates

## Questions?

- Open an issue for questions or discussions
- Check existing documentation first
- Be respectful and patient with maintainers

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project documentation

Thank you for contributing to ChainCheck! 🎉

