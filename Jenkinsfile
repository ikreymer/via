#!groovy

node {
    stage 'Build'
    checkout scm

    buildVersion = sh(
        script: 'python -c "import via; print(via.__version__)"',
        returnStdout: true
    ).trim()

    // Docker tags may not contain '+'
    dockerTag = buildVersion.replace('+', '-')

    // Set build metadata
    currentBuild.displayName = buildVersion
    currentBuild.description = "Docker: ${dockerTag}"

    sh "make docker DOCKER_TAG=${dockerTag}"
    img = docker.image "hypothesis/via:${dockerTag}"

    // We only push the image to the Docker Hub if we're on master
    if (env.BRANCH_NAME != 'master') {
        return
    }
    stage 'Push'
    docker.withRegistry('', 'docker-hub-build') {
        img.push()
        img.push('latest')
    }
}
