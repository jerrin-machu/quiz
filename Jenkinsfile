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
        sshagent(['k8s-master-ssh']) {
            sh '''
                echo "📦 Importing image and deploying..."
                ssh -p ${K8S_MASTER_PORT} -o StrictHostKeyChecking=no ${K8S_MASTER_USER}@${K8S_MASTER_HOST} "
                    mkdir -p ~/quiz-app/k8s
                "
                scp -P ${K8S_MASTER_PORT} -o StrictHostKeyChecking=no -r k8s/* ${K8S_MASTER_USER}@${K8S_MASTER_HOST}:~/quiz-app/k8s/
                ssh -p ${K8S_MASTER_PORT} -o StrictHostKeyChecking=no ${K8S_MASTER_USER}@${K8S_MASTER_HOST} "
                    sudo ctr -n=k8s.io images import /tmp/${APP_NAME}.tar &&
                    kubectl apply -f ~/quiz-app/k8s/namespace.yaml &&
                    kubectl apply -f ~/quiz-app/k8s/deployment.yaml &&
                    kubectl apply -f ~/quiz-app/k8s/service.yaml

                    kubectl rollout status deployment/${APP_NAME}-deployment -n quiz-app-ns
                "
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
            echo "❌ Deployment failed — please check SSH or Kubernetes configuration."
        }
    }
}
