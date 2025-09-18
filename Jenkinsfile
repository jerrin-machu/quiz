pipeline {
    agent any
    
    environment {
        PROD_SSH_HOST = '192.168.50.187'
        PROD_SSH_USER = 'jerrin'
        PROD_DEPLOY_DIR = '/home/jerrin/react-app'
        BUILD_DIR = 'dist' // change to 'build' if using CRA
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Install & Build') {
            steps {
                script {
                    // Use docker.image().inside() to ensure files persist to host workspace
                    docker.image('node:18').inside('-u root') {
                        sh '''
                            echo "=== Build Stage Started ==="
                            echo "Current directory: $(pwd)"
                            echo "Workspace contents before build:"
                            ls -la
                            
                            # Setup npm cache
                            mkdir -p .npm-cache
                            npm config set cache "$(pwd)/.npm-cache" --userconfig "$(pwd)/.npmrc"
                            
                            # Install dependencies
                            echo "Installing dependencies..."
                            npm ci || npm install
                            
                            # Build the application
                            echo "Building application..."
                            npm run build
                            
                            echo "Build completed. Workspace contents:"
                            ls -la
                            
                            # Create tar archive
                            if [ -d "$BUILD_DIR" ]; then
                                echo "Creating tar archive from $BUILD_DIR directory"
                                echo "Contents of $BUILD_DIR:"
                                ls -la $BUILD_DIR/
                                
                                tar -czf react-build.tar.gz $BUILD_DIR/
                                echo "Archive created successfully"
                                ls -la react-build.tar.gz
                                
                                # Verify archive contents
                                echo "Archive contents:"
                                tar -tzf react-build.tar.gz | head -10
                            else
                                echo "ERROR: $BUILD_DIR directory not found!"
                                echo "Available directories:"
                                ls -la
                                exit 1
                            fi
                            echo "=== Build Stage Completed ==="
                        '''
                    }
                    
                    // Verify file exists after container exits
                    sh '''
                        echo "=== Verifying build artifact ==="
                        if [ -f react-build.tar.gz ]; then
                            echo "✅ react-build.tar.gz exists in workspace"
                            ls -la react-build.tar.gz
                        else
                            echo "❌ react-build.tar.gz not found in workspace"
                            echo "Current workspace contents:"
                            ls -la
                            exit 1
                        fi
                    '''
                }
            }
        }
        
        stage('Copy build to remote') {
            steps {
                script {
                    // Verify the archive exists
                    sh 'ls -la react-build.tar.gz'
                }
                sshagent(['deploy-key']) {
                    sh '''
                        echo "Copying build to remote server..."
                        scp -o StrictHostKeyChecking=no -v react-build.tar.gz $PROD_SSH_USER@$PROD_SSH_HOST:/tmp/
                        echo "Copy completed"
                    '''
                }
            }
        }
        
        stage('Deploy on server') {
            steps {
                sshagent(['deploy-key']) {
                    sh '''
                        echo "Deploying on remote server..."
                        ssh -o StrictHostKeyChecking=no $PROD_SSH_USER@$PROD_SSH_HOST "
                            echo 'Taking ownership of deployment directory...' &&
                            sudo chown -R jerrin:jerrin $PROD_DEPLOY_DIR 2>/dev/null || true &&
                            echo 'Creating deployment directory...' &&
                            mkdir -p $PROD_DEPLOY_DIR &&
                            echo 'Backing up previous deployment...' &&
                            if [ -d $PROD_DEPLOY_DIR/backup ]; then rm -rf $PROD_DEPLOY_DIR/backup; fi &&
                            if [ -d $PROD_DEPLOY_DIR/current ]; then mv $PROD_DEPLOY_DIR/current $PROD_DEPLOY_DIR/backup; fi &&
                            mkdir -p $PROD_DEPLOY_DIR/current &&
                            echo 'Extracting build files...' &&
                            tar -xzf /tmp/react-build.tar.gz -C $PROD_DEPLOY_DIR/current --strip-components=1 &&
                            echo 'Setting proper permissions for web server...' &&
                            sudo chmod -R 755 $PROD_DEPLOY_DIR &&
                            echo 'Cleaning up...' &&
                            rm /tmp/react-build.tar.gz &&
                            echo 'Deployment completed successfully' &&
                            echo 'App deployed to: $PROD_DEPLOY_DIR/current'
                        "
                    '''
                }
            }
        }
    }
    
    post {
        always {
            // Clean up workspace
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