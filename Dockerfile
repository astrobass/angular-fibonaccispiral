FROM nginx:alpine
COPY app/*.html /usr/share/nginx/html/
COPY app/*.js /usr/share/nginx/html/
