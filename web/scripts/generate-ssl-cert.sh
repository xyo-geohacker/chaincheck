#!/bin/bash
# Generate self-signed SSL certificate for www.chaincheck.com
# This is for local development/demo purposes only

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CERTS_DIR="$PROJECT_DIR/certs"

# Create certs directory if it doesn't exist
mkdir -p "$CERTS_DIR"

# Generate private key
echo "🔐 Generating private key..."
openssl genrsa -out "$CERTS_DIR/chaincheck.key" 2048

# Generate certificate signing request
echo "📝 Generating certificate signing request..."
openssl req -new -key "$CERTS_DIR/chaincheck.key" -out "$CERTS_DIR/chaincheck.csr" -subj "/C=US/ST=State/L=City/O=ChainCheck/CN=www.chaincheck.com"

# Generate self-signed certificate (valid for 365 days)
# Create a temporary config file for certificate extensions
TEMP_CONFIG=$(mktemp)
cat > "$TEMP_CONFIG" <<EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = US
ST = State
L = City
O = ChainCheck
CN = www.chaincheck.com

[v3_req]
# Key usage extensions required by Chrome
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names
basicConstraints = CA:FALSE

[alt_names]
DNS.1 = www.chaincheck.com
DNS.2 = chaincheck.com
DNS.3 = localhost
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

echo "✅ Generating self-signed certificate..."
openssl x509 -req -days 365 -in "$CERTS_DIR/chaincheck.csr" -signkey "$CERTS_DIR/chaincheck.key" -out "$CERTS_DIR/chaincheck.crt" -extensions v3_req -extfile "$TEMP_CONFIG"

# Clean up temp config file
rm -f "$TEMP_CONFIG"

# Clean up CSR file
rm "$CERTS_DIR/chaincheck.csr"

echo ""
echo "✅ SSL certificate generated successfully!"
echo ""
echo "Certificate files:"
echo "  - Private key: $CERTS_DIR/chaincheck.key"
echo "  - Certificate: $CERTS_DIR/chaincheck.crt"
echo ""
echo "Next steps:"
echo "  1. Add to /etc/hosts (requires sudo):"
echo "     127.0.0.1  www.chaincheck.com"
echo "     127.0.0.1  chaincheck.com"
echo ""
echo "  2. Trust the certificate (macOS):"
echo "     sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain $CERTS_DIR/chaincheck.crt"
echo ""
echo "  3. Start the dev server:"
echo "     npm run dev:https"
echo ""

