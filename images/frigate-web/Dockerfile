# Dashboard for lawallet-frigate. Shipped as an image because Umbrel app updates copy only
# docker-compose.yml, templates, exports.sh, torrc, hooks and umbrel-app.yml from the app folder.
FROM nginx:1.28-alpine@sha256:a8b39bd9cf0f83869a2162827a0caf6137ddf759d50a171451b335cecc87d236
COPY default.conf /etc/nginx/conf.d/default.conf
COPY index.html app.js icon.svg /srv/
COPY fonts /srv/fonts
