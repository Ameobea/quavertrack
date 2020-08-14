docker-build-backend:
  docker build --build-arg UPDATE_TOKEN=$UPDATE_TOKEN -t ameo/quavertrack-backend .

deploy:
  just docker-build-backend
  docker tag ameo/quavertrack-backend:latest gcr.io/free-tier-164405/quavertrack-backend:latest
  docker push gcr.io/free-tier-164405/quavertrack-backend:latest

  gcloud config set run/region $GCLOUD_REGION

  gcloud beta run deploy quavertrack-backend \
    --platform managed \
    --set-env-vars="ROCKET_DATABASES=$ROCKET_DATABASES" \
    --image gcr.io/free-tier-164405/quavertrack-backend:latest

  cd frontend && yarn build && just deploy

