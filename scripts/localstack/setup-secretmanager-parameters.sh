#!/bin/bash

# Wait for LocalStack to be ready
echo "Waiting for LocalStack to be ready..."
while ! curl -s http://localhost:4566/_localstack/init > /dev/null; do
    sleep 1
done

echo "LocalStack is ready. Setting up Secrets Manager parameters..."

export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_SESSION_TOKEN=test
export AWS_DEFAULT_REGION=us-east-1

# Set Secrets Manager secret
aws --endpoint-url=http://localhost:4566 secretsmanager create-secret \
    --name "myapp-secret-value" \
    --secret-string 'secret-value' \
    --description "Secret value for myapp"

echo "Secrets Manager secrets have been set up successfully!" 
