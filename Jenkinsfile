pipeline {
  agent { docker { image 'node:18' } }   // whole pipeline runs inside Node container
  environment {
    PROD_SSH_HOST = '192.168.50.187'
    PROD_SSH_USER = 'jerrin'
    PROD_APP_DIR  = '/srv/react-app'
    DEPLOY_CRED   = 'deploy-key'

    npm_config_cache = "${WORKSPACE}/.npm-cache"
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Install & Build') {
      steps {
        sh  'npm config set cache $(pwd)/.npm-cache --global'
        sh 'npm ci'
        sh 'npm run build'
        sh 'tar -czf react-build.tar.gz dist'
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
              chown -R ${PROD_SSH_USER}:${PROD_SSH_USER} ${PROD_APP_DIR} &&
              sudo systemctl reload nginx || true
            "
          '''
        }
      }
    }
  }
}
