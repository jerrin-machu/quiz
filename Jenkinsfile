pipeline {
    agent { label 'blackwidow' }

    environment {
        APP_NAME = 'quiz-app'
        IMAGE_TAG = "${env.BUILD_NUMBER}"
        K8S_MASTER_USER = 'jerry'
        K8S_MASTER_HOST = '14.194.88.34'
        K8S_MASTER_PORT = '8022'
        SSH_CREDENTIALS_ID = 'k8s-master-ssh'
    }

    stages {
        stage('Checkout') {
            steps {
                echo "🌀 Checking out code..."
                checkout scm
            }
        }

        stage('Build Docker Image') {
            steps {
                echo "🐳 Building Docker image..."
                sh "docker build -t ${APP_NAME}:${IMAGE_TAG} ."
            }
        }

        stage('Verify SSH Access to Kubernetes Master') {
            steps {
                echo "🔍 Verifying SSH connection..."
                sshagent([SSH_CREDENTIALS_ID]) {
                    sh '''
                        echo "Testing SSH connection..."
                        ssh -o StrictHostKeyChecking=no -p 8022 ${K8S_MASTER_USER}@${K8S_MASTER_HOST} "echo ✅ SSH connection successful"
                    '''
                }
            }
        }

        stage('Transfer Image to Cluster') {
            steps {
                sshagent([SSH_CREDENTIALS_ID]) {
                    sh '''
                        echo "📦 Saving Docker image..."
                        docker save ${APP_NAME}:${IMAGE_TAG} -o ${APP_NAME}.tar

                        echo "🚀 Copying image to Kubernetes master..."
                        scp -P ${K8S_MASTER_PORT} -o StrictHostKeyChecking=no ${APP_NAME}.tar ${K8S_MASTER_USER}@${K8S_MASTER_HOST}:/tmp/
                    '''
                }
            }
        }

        stage('Update Deployment & Deploy') {
            steps {
                sshagent([SSH_CREDENTIALS_ID]) {
                    sh '''
                        echo "📦 Preparing deployment..."

                        # Step 1: Create directory
                        ssh -p ${K8S_MASTER_PORT} -o StrictHostKeyChecking=no ${K8S_MASTER_USER}@${K8S_MASTER_HOST} "mkdir -p ~/quiz-app/k8s"

                        # Step 2: Update deployment.yaml locally
                        echo "🛠️  Updating deployment.yaml with build number ${IMAGE_TAG}..."
                        sed -i "s|image: docker.io/library/${APP_NAME}:.*|image: docker.io/library/${APP_NAME}:${IMAGE_TAG}|g" k8s/deployment.yaml

                        echo "✅ Updated deployment.yaml:"
                        cat k8s/deployment.yaml

                        # Step 3: Copy manifests to server
                        echo "📋 Copying manifests..."
                        scp -P ${K8S_MASTER_PORT} -o StrictHostKeyChecking=no -r k8s/* ${K8S_MASTER_USER}@${K8S_MASTER_HOST}:~/quiz-app/k8s/

                        # Step 4: Deploy on remote server
                        echo "🚀 Deploying to Kubernetes..."
                        ssh -p ${K8S_MASTER_PORT} -o StrictHostKeyChecking=no ${K8S_MASTER_USER}@${K8S_MASTER_HOST} << 'REMOTE_COMMANDS'
set -e

echo "📦 Importing image into containerd (k8s.io namespace)..."
sudo ctr --namespace k8s.io images import /tmp/${APP_NAME}.tar

echo "✅ Image imported!"

echo "📋 Applying Kubernetes manifests..."
kubectl apply -f ~/quiz-app/k8s/namespace.yaml
kubectl apply -f ~/quiz-app/k8s/deployment.yaml
kubectl apply -f ~/quiz-app/k8s/service.yaml

echo "🔄 Forcing rollout with new image tag..."
kubectl set image deployment/${APP_NAME}-deployment -n quiz-app-ns ${APP_NAME}=docker.io/library/${APP_NAME}:${IMAGE_TAG}

echo "⏳ Waiting for rollout (up to 180 seconds)..."
kubectl rollout status deployment/${APP_NAME}-deployment -n quiz-app-ns --timeout=180s || {
    echo "⚠️ Rollout timed out - checking pod status..."
    kubectl get pods -n quiz-app-ns -o wide
    exit 1
}

echo "✅ Deployment successful!"
REMOTE_COMMANDS
                    '''
                }
            }
        }
    }

    post {
        success {
            echo "✅ Deployment completed successfully!"
        }
        failure {
            echo "❌ Deployment failed — check logs above for details"
        }
    }
}