pipeline {
    agent any
    
    stages {
        stage('Clone Repository') {
            steps {
                git 'git@github.com:PiDev-2025/Backend.git'
            }
        }
        
        stage('Install Dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('Run Tests') {
            steps {
                sh 'npm test'
            }
        }
        
        stage('SonarQube Analysis') {
            steps {
                script {
                    def scannerHome = tool 'SonarQube Scanner'
                    withSonarQubeEnv('SonarQube') {
                        sh "${scannerHome}/bin/sonar-scanner"
                    }
                }
            }
        }
        
        stage('Build Docker Image') {
            steps {
                sh 'docker build -t my-node-app .'
            }
        }
        
        stage('Run App in Docker') {
            steps {
                sh 'docker run -d -p 5000:5000 my-node-app'
            }
        }
    }
}
