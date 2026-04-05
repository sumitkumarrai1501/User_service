pipeline {
    agent any

    environment {
        AWS_REGION     = "us-east-1"
        ECR_REPO       = "user-service"
        ECS_CLUSTER    = "Dev_cluster_new"
        ECS_SERVICE    = "user-service-new-service-egsptfmt"
        // Ensure this matches your actual Task Definition name in AWS Console
        TASK_DEF_NAME  = "user-service" 
        IMAGE_TAG      = "${BUILD_NUMBER}"
        AWS_ACCOUNT_ID = "515966537510"
        ECR_URI        = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}"
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
                docker tag ${ECR_REPO}:${IMAGE_TAG} ${ECR_URI}:latest
                """
            }
        }

        stage('Push and Deploy to AWS') {
            steps {
                // 'aws_credentials' must match the ID in Jenkins Credentials Manager
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding', 
                    credentialsId: 'aws_credentials', 
                    accessKeyVariable: 'AWS_ACCESS_KEY_ID', 
                    secretKeyVariable: 'AWS_SECRET_ACCESS_KEY'
                ]]) {
                    sh """
                    # 1. Login to ECR
                    aws ecr get-login-password --region ${AWS_REGION} | \
                    docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

                    # 2. Push to ECR
                    docker push ${ECR_URI}:${IMAGE_TAG}
                    docker push ${ECR_URI}:latest

                    # 3. Register New Task Definition (Updates the image pointer)
                    aws ecs describe-task-definition --task-definition ${TASK_DEF_NAME} --query taskDefinition > task-def.json
                    
                    cat task-def.json | jq --arg IMAGE "${ECR_URI}:${IMAGE_TAG}" \
                    '.containerDefinitions[0].image = \$IMAGE | del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)' > new-task-def.json
                    
                    aws ecs register-task-definition --cli-input-json file://new-task-def.json

                    # 4. Deploy to ECS
                    aws ecs update-service \
                        --cluster ${ECS_CLUSTER} \
                        --service ${ECS_SERVICE} \
                        --task-definition ${TASK_DEF_NAME} \
                        --force-new-deployment \
                        --region ${AWS_REGION}
                    """
                }
            }
        }
    }

    post {
        always {
            // Cleans up old build images to prevent disk space issues on the Jenkins node
            sh "docker image prune -f"
        }
    }
}
