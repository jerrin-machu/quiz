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

        stage('Load Image into containerd & Deploy') {
            steps {
                sshagent([SSH_CREDENTIALS_ID]) {
                    sh """
                        echo "📦 Importing image and deploying..."

                        # Step 1: Prepare directories on master
                        ssh -p ${K8S_MASTER_PORT} -o StrictHostKeyChecking=no ${K8S_MASTER_USER}@${K8S_MASTER_HOST} "mkdir -p ~/quiz-app/k8s"

                        # Step 2: Patch deployment.yaml with correct indentation
                        echo "🛠️  Patching deployment.yaml for correct image reference..."
                        sed -i 's|image:.*|image: docker.io/library/${APP_NAME}:${IMAGE_TAG}|g' k8s/deployment.yaml
                        sed -i '/^[[:space:]]*image: docker.io\/library\/${APP_NAME}:/a\\          imagePullPolicy: Never' k8s/deployment.yaml

                        echo "✅ Patched deployment.yaml preview:"
                        cat k8s/deployment.yaml

                        # Step 3: Copy Kubernetes manifests
                        scp -P ${K8S_MASTER_PORT} -o StrictHostKeyChecking=no -r k8s/* ${K8S_MASTER_USER}@${K8S_MASTER_HOST}:~/quiz-app/k8s/

                        # Step 4: Deploy remotely
                        ssh -p ${K8S_MASTER_PORT} -o StrictHostKeyChecking=no ${K8S_MASTER_USER}@${K8S_MASTER_HOST} "bash -s" <<'EOF'
                            set -e
                            echo "🚀 Importing image into containerd..."
                            sudo ctr images import /tmp/${APP_NAME}.tar

                            echo "🔖 Handling image tags..."
                            # Remove the old 'latest' tag if it exists
                            sudo ctr images rm docker.io/library/${APP_NAME}:latest 2>/dev/null || true
                            
                            # Tag the imported image as latest
                            LATEST_TAG=\$(sudo ctr images ls | grep ${APP_NAME} | grep -v latest | head -n 1 | awk '{print \$1}')
                            if [ -z "\$LATEST_TAG" ]; then
                                echo "Using build number tag..."
                                LATEST_TAG="docker.io/library/${APP_NAME}:${IMAGE_TAG}"
                            fi
                            echo "Tagging \$LATEST_TAG as latest..."
                            sudo ctr images tag "\$LATEST_TAG" docker.io/library/${APP_NAME}:latest

                            echo "📦 Applying Kubernetes manifests..."
                            kubectl apply -f ~/quiz-app/k8s/namespace.yaml
                            kubectl apply -f ~/quiz-app/k8s/deployment.yaml
                            kubectl apply -f ~/quiz-app/k8s/service.yaml

                            echo "⏳ Waiting for rollout..."
                            kubectl rollout status deployment/${APP_NAME}-deployment -n quiz-app-ns --timeout=180s || \
                              (echo "⚠️ Rollout timeout — showing pods:" && kubectl get pods -n quiz-app-ns -o wide)
                        EOF
                    """
                }
            }
        }
    }

    post {
        success {
            echo "✅ Deployment completed successfully!"
        }
        failure {
            echo "❌ Deployment failed — please check SSH or Kubernetes configuration."
        }
    }
}