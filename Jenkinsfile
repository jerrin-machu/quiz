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
    DOCKER_CREDENTIALS = credentials('quiz-app-docker-hub')
        
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

            stage('Push to Registry') {
            when {
                expression { return env.DOCKER_REGISTRY != '' }
            }
            steps {
                echo "Pushing image to Docker registry..."
                script {
                    sh """
                        echo "$DOCKER_CREDENTIALS_PSW" | docker login -u "$DOCKER_CREDENTIALS_USR" --password-stdin
                        docker push ${DOCKER_REGISTRY}/${APP_NAME}:${IMAGE_TAG}
                    """
                }
            }
        }

          stage('Deploy to Server') {
            steps {
                sshagent(['blackwidow-app-nginx']) {

                    sh ''' 
                    
                     echo "Starting deployment..."
                    
               ssh -o StrictHostKeyChecking=no -p ${PROD_SSH_PORT} ${PROD_SSH_USER}@${PROD_SSH_HOST} "
                    
               docker pull ${DOCKER_REGISTRY}/${APP_NAME}:${IMAGE_TAG} || true &&

                echo "Stopping and removing old container (if exists)..."
                    docker stop ${APP_NAME} || true
                    docker rm ${APP_NAME} || true
               
               docker run -d --name ${APP_NAME} -p 8080:80 ${DOCKER_REGISTRY}/${APP_NAME}:${IMAGE_TAG}
                    
                  echo "Starting new container..."
                    docker run -d --name ${APP_NAME} -p 8080:80 ${DOCKER_REGISTRY}/${APP_NAME}:${IMAGE_TAG}

                    echo "Deployment complete!"   
                    
                    
                    "
                    
                    
                     '''




                }
                
            }
        }

  }
}