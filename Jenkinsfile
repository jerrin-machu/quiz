pipeline {
    agent any

    options {
        buildDiscarder logRotator(daysToKeepStr: '29', numToKeepStr: '1')
    }

    environment {
        PROD_SSH_HOST = '49.204.64.58'
        PROD_SSH_USER = 'jerrin'
        PROD_SSH_PORT = '65518'
        APP_NAME = 'quiz-app'
        IMAGE_TAG = "${env.BUILD_NUMBER}"
        SSH_CREDENTIALS_ID = 'blackwidow-app-nginx'
        APP_PORT = '51873'   // <--- ✅ Updated port
    }

    stages {
        stage('Checkout') {
            steps {
                script {
                    echo "🌀 Checking out branch: ${params.BRANCH}"

                    checkout([
                        $class: 'GitSCM',
                        branches: [[name: "*/${params.BRANCH}"]],
                        doGenerateSubmoduleConfigurations: false,
                        extensions: [],
                        userRemoteConfigs: [[
                            url: 'https://github.com/jerrin-machu/quiz.git',
                            credentialsId: 'blackwidow-app-nginx'
                        ]]
                    ])
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                echo "🐳 Building Docker image for ${APP_NAME}:${IMAGE_TAG}"
                sh "docker build -t ${APP_NAME}:${IMAGE_TAG} ."
            }
        }

        stage('Transfer Image to Target Server') {
            steps {
                echo "📦 Exporting image and sending to target server..."
                sshagent(['blackwidow-app-nginx']) {
                    sh """
                        docker save ${APP_NAME}:${IMAGE_TAG} -o ${APP_NAME}.tar
                        scp -P ${PROD_SSH_PORT} -o StrictHostKeyChecking=no ${APP_NAME}.tar ${PROD_SSH_USER}@${PROD_SSH_HOST}:/tmp/
                        rm -f ${APP_NAME}.tar
                    """
                }
            }
        }

        stage('Deploy on Target Server') {
            steps {
                sshagent(['blackwidow-app-nginx']) {
                    sh """
                        echo "🚀 Deploying on target server..."

                        ssh -o StrictHostKeyChecking=no -p ${PROD_SSH_PORT} ${PROD_SSH_USER}@${PROD_SSH_HOST} '
                            echo "📦 Loading image..."
                            docker load -i /tmp/${APP_NAME}.tar

                            echo "🧹 Removing old container (if exists)..."
                            docker stop ${APP_NAME} || true
                            docker rm ${APP_NAME} || true

                            echo "🧹 Checking if port ${APP_PORT} is in use..."
                            if lsof -i:${APP_PORT} -t > /tmp/port_pid.txt 2>/dev/null; then
                                echo "⚠️ Port ${APP_PORT} in use — killing process..."
                                xargs kill -9 < /tmp/port_pid.txt || true
                                rm -f /tmp/port_pid.txt
                            fi

                            echo "🔥 Running new container on port ${APP_PORT}..."
                            docker run -d --name ${APP_NAME} -p ${APP_PORT}:80 ${APP_NAME}:${IMAGE_TAG}

                            echo "🧼 Cleaning up..."
                            rm -f /tmp/${APP_NAME}.tar

                            echo "✅ Deployment complete! App is running on port ${APP_PORT}"
                        '
                    """
                }
            }
        }

        stage('Health Check') {
            steps {
                sh """
                    echo "🩺 Checking if app is live on ${PROD_SSH_HOST}:${APP_PORT}..."
                    sleep 5
                    curl -I http://${PROD_SSH_HOST}:${APP_PORT} || echo "⚠️ App might not be reachable yet"
                """
            }
        }
    }

    post {
        success {
            echo "✅ Deployment successful on port ${APP_PORT}!"
        }
        failure {
            echo "❌ Deployment failed!"
        }
    }
}
