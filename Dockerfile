FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx-stare-strane.map /etc/nginx/conf.d/rime-stare-strane.map
COPY nginx-strane-mala.map /etc/nginx/conf.d/rime-strane-mala.map
COPY nginx-kanon-rec.map /etc/nginx/conf.d/rime-kanon-rec.map
COPY public/ /usr/share/nginx/html/
EXPOSE 80
