pipeline {
    agent any

    environment {
        AWS_REGION = "us-east-1"
        ECR_REPO = "order-service"
        ECS_CLUSTER = "arun-dev-cluster"
        ECS_SERVICE = "arun-order-service-service"
        TASK_DEF_NAME = "arun-order-service"
        IMAGE_TAG = "${BUILD_NUMBER}"
        AWS_ACCOUNT_ID = "065109818578"
        ECR_URI = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Docker Image') {
            steps {
                sh """
                docker build -t ${ECR_REPO}:${IMAGE_TAG} .
                docker tag ${ECR_REPO}:${IMAGE_TAG} ${ECR_URI}:${IMAGE_TAG}
                """
            }
        }

        stage('AWS Deployment Operations') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding', 
                    credentialsId: 'aws_credentials', 
                    accessKeyVariable: 'AWS_ACCESS_KEY_ID', 
                    secretKeyVariable: 'AWS_SECRET_ACCESS_KEY'
                ]]) {
                    // 1. Login to Amazon ECR
                    sh """
                    aws ecr get-login-password --region ${AWS_REGION} | \
                    docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
                    """
                    
                    // 2. Push Image to ECR
                    sh "docker push ${ECR_URI}:${IMAGE_TAG}"

                    // 3. Update Task Definition with New Image
                    // Note: \$IMAGE is escaped so Jenkins doesn't try to interpret it as a Groovy variable
                    sh """
                    aws ecs describe-task-definition --task-definition ${TASK_DEF_NAME} --query taskDefinition > task-def.json
                    
                    cat task-def.json | jq --arg IMAGE "${ECR_URI}:${IMAGE_TAG}" \
                    '.containerDefinitions[0].image = \$IMAGE | del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)' > new-task-def.json
                    
                    aws ecs register-task-definition --cli-input-json file://new-task-def.json
                    """

                    // 4. Update ECS Service to use the new Revision
                    sh """
                    aws ecs update-service
