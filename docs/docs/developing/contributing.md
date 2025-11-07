# Contributing

Thank you for your interest in contributing to the Concept Mapping Tool! We welcome contributions from the community and appreciate your help in making this project better.

## How to Contribute

### 1. Fork the Repository

Start by forking the repository on GitHub:

1. Navigate to the [repository](https://github.com/verveguy/concept-maps)
2. Click the "Fork" button in the top-right corner
3. This creates a copy of the repository in your GitHub account

### 2. Clone Your Fork

Clone your forked repository to your local machine:

```bash
git clone https://github.com/YOUR_USERNAME/concept-maps.git
cd concept-maps
```

Replace `YOUR_USERNAME` with your GitHub username.

### 3. Set Up Upstream Remote

Add the original repository as an upstream remote to keep your fork synchronized:

```bash
git remote add upstream https://github.com/verveguy/concept-maps.git
```

Verify your remotes:

```bash
git remote -v
```

You should see:
- `origin` - Your fork
- `upstream` - The original repository

### 4. Create a Branch

Create a new branch for your contribution:

```bash
git checkout -b feature/your-feature-name
```

Or for bug fixes:

```bash
git checkout -b fix/your-bug-fix-name
```

**Branch naming conventions:**
- `feature/` - For new features
- `fix/` - For bug fixes
- `docs/` - For documentation changes
- `refactor/` - For code refactoring
- `test/` - For adding or updating tests

### 5. Make Your Changes

- Follow the project's coding standards and patterns
- Review the [Architecture Overview](../developing/architecture/overview.md) to understand the codebase structure
- Check the [Development Guides](../developing/guides/react-flow-optimization.md) for best practices
- Write clear, self-documenting code
- Add comments for complex logic
- Update documentation pages when adding features or making significant changes

### 6. Test Your Changes

Before submitting, ensure your changes work correctly:

```bash
# Run the development server
pnpm dev

# Run linting
pnpm lint

# Build for production (check for errors)
pnpm build
```

### 7. Commit Your Changes

Write clear, descriptive commit messages:

```bash
git add .
git commit -m "Add feature: brief description of what you added"
```

**Commit message guidelines:**
- Use present tense ("Add feature" not "Added feature")
- Be specific and concise
- Reference issue numbers if applicable: "Fix #123: description"

### 8. Keep Your Fork Updated

Before submitting a pull request, sync with the upstream repository:

```bash
# Fetch latest changes
git fetch upstream

# Switch to main branch
git checkout main

# Merge upstream changes
git merge upstream/main

# Push to your fork
git push origin main

# Switch back to your feature branch
git checkout feature/your-feature-name

# Rebase on updated main (optional, but recommended)
git rebase main
```

### 9. Push to Your Fork

Push your branch to your GitHub fork:

```bash
git push origin feature/your-feature-name
```

### 10. Submit a Pull Request

1. Navigate to your fork on GitHub
2. Click "Compare & pull request"
3. Fill out the pull request template:
   - **Title**: Clear, descriptive title
   - **Description**: Explain what changes you made and why
   - **Related Issues**: Reference any related issues (e.g., "Closes #123")
   - **Testing**: Describe how you tested your changes
   - **Screenshots**: If applicable, include screenshots or GIFs

4. Click "Create pull request"

## Reporting Issues

We use GitHub Issues to track bugs and feature requests. Before creating an issue, please check if a similar issue already exists.

### Bug Reports

When reporting a bug, please include:

- **Clear description** of the bug
- **Steps to reproduce** the issue
- **Expected behavior** vs **Actual behavior**
- **Screenshots** or error messages (if applicable)
- **Environment details**:
  - Browser and version
  - Operating system
  - Node.js version
  - Any relevant configuration

### Feature Requests

For feature requests, please include:

- **Clear description** of the feature
- **Use case** - Why is this feature needed?
- **Proposed solution** (if you have ideas)
- **Alternatives considered** (if any)

### Creating an Issue

1. Go to the [Issues page](https://github.com/verveguy/concept-maps/issues)
2. Click "New Issue"
3. Choose the appropriate template (Bug Report or Feature Request)
4. Fill out the template with as much detail as possible
5. Submit the issue

## Tackling Issues

We welcome contributors to tackle any open issue! Here's how to get started:

### Finding Issues to Work On

1. **Browse open issues**: Check the [Issues page](https://github.com/verveguy/concept-maps/issues)
2. **Look for labels**: 
   - `good first issue` - Great for new contributors
   - `help wanted` - We'd love help with these
   - `bug` - Issues that need fixing
   - `enhancement` - Feature requests

### Claiming an Issue

1. **Comment on the issue** to let others know you're working on it
2. **Ask questions** if anything is unclear
3. **Start working** on your fork

### Working on an Issue

1. Follow the steps in "How to Contribute" above
2. Reference the issue number in your branch name: `fix/issue-123-description`
3. Reference the issue in your commit messages: "Fix #123: description"
4. In your pull request, mention "Closes #123" to automatically link and close the issue

## Code Review Process

Once you submit a pull request:

1. **Automated checks** will run (linting, builds, etc.)
2. **Maintainers will review** your code
3. **Feedback may be requested** - Don't worry, this is normal!
4. **Make requested changes** by pushing more commits to your branch
5. **Once approved**, your PR will be merged

### Responding to Feedback

- Be open to suggestions and feedback
- Ask questions if something is unclear
- Make requested changes promptly
- Keep discussions focused and constructive

## Development Guidelines

### Code Style

- Follow the existing code style in the project
- Use TypeScript for type safety
- Write self-documenting code with clear variable names
- Add comments for complex logic

### Testing

- Test your changes thoroughly
- Ensure existing tests still pass
- Add tests for new features when possible

### Documentation

- Update documentation when adding features
- Keep inline comments up to date
- Update README if needed

## Getting Help

If you need help or have questions:

- **Check existing documentation**: Review the [Architecture Overview](../developing/architecture/overview.md) and [Development Guides](../developing/guides/react-flow-optimization.md)
- **Search issues**: Your question might have been answered before
- **Create a discussion**: Use GitHub Discussions for questions
- **Comment on issues**: Ask questions directly on relevant issues

## Recognition

Contributors will be recognized in:
- Pull request acknowledgments
- Release notes (for significant contributions)
- Project documentation (if applicable)

## Code of Conduct

We expect all contributors to:

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different viewpoints and experiences

Thank you for contributing to the Concept Mapping Tool! 🎉

