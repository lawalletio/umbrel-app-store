# nginx in front of Umbrel's Bitcoin Node dashboard, with the Frigate tab injected.
# Shipped as an image because Umbrel app updates copy only docker-compose.yml, templates,
# exports.sh, torrc, hooks and umbrel-app.yml: bind-mounted files from the app folder
# never reach an updated install.
FROM nginx:1.28-alpine@sha256:a8b39bd9cf0f83869a2162827a0caf6137ddf759d50a171451b335cecc87d236
COPY default.conf /etc/nginx/conf.d/default.conf
COPY frigate-tab.js /srv/frigate-tab.js
