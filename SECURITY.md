# Security Policy

## Supported Versions

We provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| < Latest| :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security vulnerability, please follow these steps:

1. **Do NOT** open a public GitHub issue
2. Email security details to: [INSERT SECURITY EMAIL]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)

### What to Expect

- **Acknowledgment**: You will receive an acknowledgment within 48 hours
- **Initial Assessment**: We will provide an initial assessment within 7 days
- **Updates**: We will keep you informed of our progress
- **Resolution**: We will notify you when the vulnerability is fixed

### Disclosure Policy

- We will disclose the vulnerability after it has been fixed and a patch is available
- We will credit you in the security advisory (unless you prefer to remain anonymous)
- We follow responsible disclosure practices

## Security Best Practices

When using ChainCheck:

1. **Keep dependencies updated**: Regularly update all dependencies
2. **Use environment variables**: Never commit secrets or API keys
3. **Enable authentication**: Use JWT authentication for API access
4. **Use HTTPS**: Always use HTTPS in production
5. **Review permissions**: Regularly review user permissions and access controls
6. **Monitor logs**: Monitor application logs for suspicious activity

## Known Security Considerations

### XYO Network Integration

- **Wallet Security**: The `XYO_WALLET_MNEMONIC` must be kept secure. Never commit it to version control
- **Private Keys**: Wallet private keys are derived from the mnemonic. Protect the mnemonic as you would protect private keys
- **API Keys**: XYO Network API keys should be stored securely and rotated regularly

### Database Security

- **Connection Strings**: Database connection strings contain credentials. Use environment variables
- **SQL Injection**: We use Prisma ORM to prevent SQL injection, but always validate user input
- **Access Control**: Ensure database access is restricted to necessary services only

### API Security

- **Rate Limiting**: API endpoints have rate limiting enabled
- **CORS**: CORS is configured to restrict cross-origin requests
- **Helmet**: Security headers are set using Helmet middleware
- **Input Validation**: All inputs are validated using Zod schemas

### Mobile App Security

- **Storage**: Sensitive data is stored securely using AsyncStorage with encryption
- **Network**: All API calls should use HTTPS
- **NFC**: NFC card data is handled securely and not stored in plain text

## Security Updates

Security updates will be:
- Released as patch versions (e.g., 1.0.0 → 1.0.1)
- Documented in CHANGELOG.md
- Announced via GitHub releases
- Tagged with security labels

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [React Security Best Practices](https://reactjs.org/docs/security.html)

## Contact

For security concerns, contact: [INSERT SECURITY EMAIL]

For general questions, open a GitHub issue or discussion.

