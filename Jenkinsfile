pipeline {
    agent any 
     options {
    buildDiscarder logRotator(daysToKeepStr: '29', numToKeepStr: '1')
  }
    environment {
    PROD_SSH_HOST = '49.204.64.58'
    PROD_SSH_USER = 'jerrin'
    PROD_SSH_PORT = '65518'
    PROD_DEPLOY_DIR = '/home/jerrin/react-app'
    BUILD_DIR = 'dist'
    SSH_CREDENTIALS_ID = 'blackwidow-app-nginx'
    APP_NAME = 'quiz-app'
    IMAGE_TAG = "${env.BUILD_NUMBER}"
    DOCKER_REGISTRY = 'jerrinmachu'     // Change this if using private registry
                       // Replace with your target server IP
        
  }

  stages {
    stage('Checkout'){
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
    stage('Build Docker Image'){
        steps {
                echo "Building Docker image for ${APP_NAME}:${IMAGE_TAG}"
                script {
                    sh """
                        docker build -t ${DOCKER_REGISTRY}/${APP_NAME}:${IMAGE_TAG} .
                    """
                }
            }
    }
  }
}