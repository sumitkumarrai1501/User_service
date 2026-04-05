pipeline {
    agent any

    environment {
        AWS_REGION = "us-east-1"
        ECR_REPO = "order-service"
        // ECS_CLUSTER = "arun-dev-cluster"
        // ECS_SERVICE = "arun-order-service-service"
        // TASK_DEF_NAME = "arun-order-service"
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
                sh '''
                docker build -t $ECR_REPO:$IMAGE_TAG .
                docker tag $ECR_REPO:$IMAGE_TAG $ECR_URI:$IMAGE_TAG
                '''
            }
        }

        stage('Login to ECR') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding', 
                    credentialsId: 'aws_credentials', 
                    accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                    secretKeyVariable: 'AWS_SECRET_ACCESS_KEY'
                ]]) {
                    sh "aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_URI}"
                }
            }
        }

        stage('Push to ECR') {
            steps {
                sh '''
                docker push $ECR_URI:$IMAGE_TAG
                '''
            }
        }

        stage('Register New Task Definition') {
            steps {
                sh '''
                aws ecs describe-task-definition \
                  --task-definition $TASK_DEF_NAME \
                  --query taskDefinition > task-def.json

                cat task-def.json | jq --arg IMAGE "$ECR_URI:$IMAGE_TAG" '
                  .containerDefinitions[0].image = $IMAGE |
                  del(
                    .taskDefinitionArn,
                    .revision,
                    .status,
                    .requiresAttributes,
                    .compatibilities,
                    .registeredAt,
                    .registeredBy
                  )' > new-task-def.json

                aws ecs register-task-definition \
                  --cli-input-json file://new-task-def.json
                '''
            }
        }

        stage('Deploy to ECS') {
            steps {
                sh '''
                aws ecs update-service \
                  --cluster $ECS_CLUSTER \
                  --service $ECS_SERVICE \
                  --task-definition $TASK_DEF_NAME \
                  --region $AWS_REGION

                aws ecs wait services-stable \
                  --cluster $ECS_CLUSTER \
                  --services $ECS_SERVICE
                '''
            }
        }
    }

    post {
        always {
            sh 'docker image prune -f'
        }
    }
}
