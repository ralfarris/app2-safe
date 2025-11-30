pipeline {
    agent any

    environment {
        DEPLOY_HOST = '10.34.100.157'
        DEPLOY_USER = 'dso504'
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
    }

    stages {
        stage('Prepare') {
            steps {
                echo "Using code checked out by Jenkins"
                checkout scm
                sh 'ls -la'
            }
        }
        
        stage('SAST Security Scan') {
            steps {
                echo "Running pre-installed Semgrep with custom rule..."
                
                sh '/home/jenkins/.local/bin/semgrep scan --config ./rules6.yml --error .'
            }
        }

        stage('Build & Test') {
            steps {
                echo "Code fetched successfully — running tests (if any)..."
                // Add tests here, e.g. sh 'npm test'
            }
        }

        stage('Deploy to Docker VPS') {
            environment {
                // This stage will only run if Semgrep passed successfully
                GH_PAT = credentials('DSO4-PAT')
            }
            steps {
                echo "Deploying to Docker VPS..."

                sshagent (credentials: ['DSO4-ssh']) {
                    sh """
                        scp -o StrictHostKeyChecking=no deploy.sh ${DEPLOY_USER}@${DEPLOY_HOST}:/tmp/deploy.sh
                    """

                    sh """
                        ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEPLOY_HOST} \
                        "export GH_PAT='${GH_PAT}' && bash /tmp/deploy.sh"
                    """
                }
            }
        }
    }

    post {
        success {
            echo 'Deployment successful!'
        }
        failure {
            echo 'Deployment failed! (Check SAST scan results if the failure occurred early.)'
        }
        always {
            echo "Pipeline finished with result: ${currentBuild.currentResult}"
        }
    }
}