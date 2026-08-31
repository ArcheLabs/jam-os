FROM node:22-alpine
WORKDIR /app
COPY tools/content-provider/server.mjs ./server.mjs
ENV CONTENT_HOST=0.0.0.0 CONTENT_PORT=8787 CONTENT_VOLUME=/var/lib/jam-content
RUN mkdir -p /var/lib/jam-content && addgroup -S jam && adduser -S jam -G jam && chown -R jam:jam /var/lib/jam-content
USER jam
EXPOSE 8787
VOLUME ["/var/lib/jam-content"]
CMD ["node", "server.mjs"]
