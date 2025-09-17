pipeline {
    agent any

    environment {
        PROD_SSH_HOST = '192.168.50.187'
        PROD_SSH_USER = 'jerrin'
        PROD_DEPLOY_DIR = '/srv/react-app'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install & Build') {
            agent {
                docker {
                    image 'node:18'
                }
            }
            steps {
                sh '''
                    mkdir -p "$WORKSPACE/.npm-cache"
                    npm config set cache "$WORKSPACE/.npm-cache"
                    npm ci
                    npm run build
                    tar -czf react-build.tar.gz dist
                '''
            }
        }

        stage('Copy build to remote') {
            steps {
                sshagent(['jerrin']) {
                    sh '''
                        scp -o StrictHostKeyChecking=no react-build.tar.gz $PROD_SSH_USER@$PROD_SSH_HOST:/tmp/
                    '''
                }
            }
        }

        stage('Deploy on server') {
            steps {
                sshagent(['jerrin']) {
                    sh '''
                        ssh -o StrictHostKeyChecking=no $PROD_SSH_USER@$PROD_SSH_HOST "
                            mkdir -p $PROD_DEPLOY_DIR &&
                            tar -xzf /tmp/react-build.tar.gz -C $PROD_DEPLOY_DIR &&
                            rm /tmp/react-build.tar.gz
                        "
                    '''
                }
            }
        }
    }

    post {
        success {
            echo "✅ React app deployed successfully!"
        }
        failure {
            echo "❌ Deployment failed. Check logs."
        }
    }
}
