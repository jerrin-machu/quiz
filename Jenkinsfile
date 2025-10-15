pipeline {
  agent any

  parameters {
    string(name: 'BRANCH', defaultValue: 'main', description: 'Select branch to deploy')
  }

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
  }

  stages {
    stage('Checkout') {
      steps {
        script {
          def cleanBranch = params.BRANCH.replaceAll(/^origin\//, '')
          echo "🌀 Checking out branch: ${cleanBranch}"

          checkout([$class: 'GitSCM',
            branches: [[name: "refs/heads/${cleanBranch}"]],
            userRemoteConfigs: [[
              url: 'https://github.com/jerrin-machu/quiz.git'
            ]]
          ])
        }
      }
    }

    stage('Install & Build') {
      steps {
        script {
          echo "⚙️ Building ${params.BRANCH}..."

          docker.image('node:18').inside('-u root') {
            sh '''
              set -e
              echo "=== Build Stage Started ==="
              mkdir -p .npm-cache
              npm config set cache "$(pwd)/.npm-cache"

              echo "Installing dependencies..."
              npm ci || npm install

              echo "Building application..."
              npm run build

              echo "Creating tar archive..."
              if [ -d "$BUILD_DIR" ]; then
                tar -czf react-build.tar.gz $BUILD_DIR/
                echo "✅ Archive created: react-build.tar.gz"
              else
                echo "❌ ERROR: $BUILD_DIR directory not found!"
                exit 1
              fi
            '''
          }

          sh '''
            if [ -f react-build.tar.gz ]; then
              echo "✅ Verified: react-build.tar.gz exists"
            else
              echo "❌ Missing react-build.tar.gz"
              exit 1
            fi
          '''
        }
      }
    }

    stage('Copy build to remote') {
      steps {
        sshagent(['blackwidow-app-nginx']) {
          sh '''
            echo "Copying build to remote..."
            scp -o StrictHostKeyChecking=no -P ${PROD_SSH_PORT} react-build.tar.gz \
              ${PROD_SSH_USER}@${PROD_SSH_HOST}:/tmp/
          '''
        }
      }
    }

    stage('Deploy on server') {
      steps {
        sshagent(['blackwidow-app-nginx']) {
          sh '''
            echo "Starting deployment..."
            ssh -o StrictHostKeyChecking=no -p ${PROD_SSH_PORT} ${PROD_SSH_USER}@${PROD_SSH_HOST} '
              set -e
              TIMESTAMP=$(date +%Y%m%d_%H%M%S)
              TEMP_DIR=${PROD_DEPLOY_DIR}/temp_${TIMESTAMP}

              mkdir -p $TEMP_DIR
              tar -xzf /tmp/react-build.tar.gz -C $TEMP_DIR --strip-components=1

              if [ -d "${PROD_DEPLOY_DIR}/current" ]; then
                rm -rf ${PROD_DEPLOY_DIR}/backup || true
                mv ${PROD_DEPLOY_DIR}/current ${PROD_DEPLOY_DIR}/backup || true
              fi

              mv $TEMP_DIR ${PROD_DEPLOY_DIR}/current
              chmod -R 755 ${PROD_DEPLOY_DIR}/current
              rm /tmp/react-build.tar.gz

              echo "✅ Deployment completed"
              ls -la ${PROD_DEPLOY_DIR}/
            '
          '''
        }
      }
    }

    stage('Reload Nginx') {
      steps {
        sshagent(['blackwidow-app-nginx']) {
          sh '''
            echo "Reloading Nginx..."
            ssh -o StrictHostKeyChecking=no -p ${PROD_SSH_PORT} ${PROD_SSH_USER}@${PROD_SSH_HOST} '
              sudo nginx -t
              sudo systemctl reload nginx
              echo "✅ Nginx reloaded successfully"
            '
          '''
        }
      }
    }
  }

  post {
    always {
      sh 'rm -f react-build.tar.gz || true'
    }
    success {
      echo "✅ React app deployed successfully!"
    }
    failure {
      echo "❌ Deployment failed. Check logs."
    }
  }
}
