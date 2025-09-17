pipeline {
  agent any

  environment {
    PROD_SSH_HOST = '192.168.50.187'
    PROD_SSH_USER = 'jerrin'
    PROD_APP_DIR  = '/srv/react-app'
    DEPLOY_CRED   = 'deploy-key'   // your Jenkins SSH credential ID
    NODE_IMAGE    = 'node:18'      // optional: use dockerized node to build
  }

  stages {
    stage('Checkout') { steps { checkout scm } }

    stage('Install & Build') {
      steps {
        // Option A: run on agent with node installed:
        // sh 'npm ci && npm run build'

        // Safer: run build inside a container (agent must support docker)
        agent { docker { image "${NODE_IMAGE}" } }
        steps {
          sh 'npm ci'
          // If you use environment variables for the build (REACT_APP_*), set them here:
          // withCredentials([...]) { sh 'REACT_APP_API=https://api.example.com npm run build' }
          sh 'npm run build'   // CRA -> build/ ; Vite -> dist/
          sh 'tar -czf react-build.tar.gz build'  // compress for transfer
        }
      }
    }

    stage('Copy build to remote') {
      steps {
        sshagent([env.DEPLOY_CRED]) {
          sh '''
            scp -o StrictHostKeyChecking=no react-build.tar.gz ${PROD_SSH_USER}@${PROD_SSH_HOST}:/tmp/
            ssh -o StrictHostKeyChecking=no ${PROD_SSH_USER}@${PROD_SSH_HOST} "
              mkdir -p ${PROD_APP_DIR} &&
              tar -xzf /tmp/react-build.tar.gz -C ${PROD_APP_DIR} --strip-components=1 &&
              rm -f /tmp/react-build.tar.gz &&
              # adjust permissions
              chown -R ${PROD_SSH_USER}:${PROD_SSH_USER} ${PROD_APP_DIR} &&
              # (optional) reload nginx
              sudo systemctl reload nginx || true
            "
          '''
        }
      }
    }
  }

  post {
    success { echo 'Deploy succeeded' }
    failure { echo 'Deploy failed — check console' }
  }
}
