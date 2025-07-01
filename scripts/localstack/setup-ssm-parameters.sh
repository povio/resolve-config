#!/bin/bash

# Wait for LocalStack to be ready
echo "Waiting for LocalStack to be ready..."
while ! curl -s http://localhost:4566/_localstack/init > /dev/null; do
    sleep 1
done

echo "LocalStack is ready. Setting up SSM parameters..."

export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_SESSION_TOKEN=test
export AWS_DEFAULT_REGION=us-east-1

# Set SSM parameters
aws --endpoint-url=http://localhost:4566 ssm put-parameter \
    --name "/myapp/database/url" \
    --value "postgresql://localhost:5432/myapp" \
    --type "String" \
    --description "Database connection URL"

aws --endpoint-url=http://localhost:4566 ssm put-parameter \
    --name "/myapp/api/key" \
    --value "your-api-key-here" \
    --type "SecureString" \
    --description "API key for external service"

aws --endpoint-url=http://localhost:4566 ssm put-parameter \
    --name "/myapp/environment" \
    --value "development" \
    --type "String" \
    --description "Application environment"

aws --endpoint-url=http://localhost:4566 ssm put-parameter \
    --name "/myapp/feature/flags" \
    --value '{"feature1": true, "feature2": false}' \
    --type "String" \
    --description "Feature flags configuration"

echo "SSM parameters have been set up successfully!" 