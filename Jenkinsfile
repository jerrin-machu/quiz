pipeline {
    agent any

    options {
        buildDiscarder logRotator(daysToKeepStr: '29', numToKeepStr: '1')
    }

    
// Host kuber-2
//     HostName 14.194.88.34
//     User jerry
//     Port 8022

    environment {
        K8S_MASTER_HOST = '14.194.88.34'
        K8S_MASTER_USER = 'jerry' // SSH user on your master node
        K8S_MASTER_PORT = '8022'    // change if custom SSH port
        APP_NAME = 'quiz-app'
        IMAGE_TAG = "${env.BUILD_NUMBER}"
        SSH_CREDENTIALS_ID = 'blackwidow-app-nginx'  // Jenkins SSH key credential ID
        KUBE_NAMESPACE = 'quiz-app-ns'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Docker Image') {
            steps {
                sh "docker build -t ${APP_NAME}:${IMAGE_TAG} ."
            }
        }

        stage('Transfer Image to Cluster') {
            steps {
                sshagent(['blackwidow-app-nginx']) {
                    sh """
                        echo "📦 Saving Docker image..."
                        docker save ${APP_NAME}:${IMAGE_TAG} -o ${APP_NAME}.tar

                        echo "🚀 Copying image to Kubernetes master..."
                        scp -P ${K8S_MASTER_PORT} -o StrictHostKeyChecking=no ${APP_NAME}.tar ${K8S_MASTER_USER}@${K8S_MASTER_HOST}:/tmp/

                        echo "🧹 Cleaning up local tar..."
                        rm -f ${APP_NAME}.tar
                    """
                }
            }
        }

        stage('Load Image into containerd & Deploy') {
            steps {
                sshagent(['blackwidow-app-nginx']) {
                    sh """
                        echo "🧩 Loading image into containerd on cluster master..."

                        ssh -p ${K8S_MASTER_PORT} -o StrictHostKeyChecking=no ${K8S_MASTER_USER}@${K8S_MASTER_HOST} '
                            echo "📥 Importing image into containerd..."
                            sudo ctr -n=k8s.io images import /tmp/${APP_NAME}.tar
                            rm -f /tmp/${APP_NAME}.tar

                            echo "🧾 Updating deployment YAML..."
                            sed -i "s#jerrinmachu/quiz-app:latest#${APP_NAME}:${IMAGE_TAG}#g" ~/quiz-app/k8s/deployment.yaml || true

                            echo "🚀 Applying Kubernetes manifests..."
                            kubectl apply -f ~/quiz-app/k8s/namespace.yaml
                            kubectl apply -f ~/quiz-app/k8s/deployment.yaml
                            kubectl apply -f ~/quiz-app/k8s/service.yaml

                            echo "⏳ Waiting for rollout..."
                            kubectl rollout status deployment/${APP_NAME}-deployment -n ${KUBE_NAMESPACE}

                            echo "✅ Deployment complete and running!"
                        '
                    """
                }
            }
        }

        stage('Health Check') {
            steps {
                sh """
                    echo "🔎 Checking if app is reachable..."
                    sleep 5
                    curl -I http://${K8S_MASTER_HOST}:51873 || echo "⚠️ App might not be reachable yet"
                """
            }
        }
    }

    post {
        success {
            echo "✅ Kubernetes deployment successful!"
        }
        failure {
            echo "❌ Deployment failed!"
        }
    }
}
