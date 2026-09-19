# Pinned rather than floating on :alpine so an image rebuild is reproducible.
FROM nginx:1.27-alpine

# Copy the demo page and the directive explicitly. A glob over app/ would
# also pick up anything added to the directory later, which is how the spec
# ended up being served in production.
COPY app/index.html /usr/share/nginx/html/
COPY app/fibSpiral.js /usr/share/nginx/html/
