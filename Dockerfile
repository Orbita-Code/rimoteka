FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx-stare-strane.map /etc/nginx/conf.d/rime-stare-strane.map
COPY public/ /usr/share/nginx/html/
EXPOSE 80
