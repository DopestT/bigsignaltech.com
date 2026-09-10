FROM ghcr.io/imputnet/cobalt:11

USER root
COPY processor/entrypoint.sh /usr/local/bin/bigsignal-cobalt-entrypoint.sh
RUN chmod 0755 /usr/local/bin/bigsignal-cobalt-entrypoint.sh
USER node

ENTRYPOINT ["/usr/local/bin/bigsignal-cobalt-entrypoint.sh"]
CMD ["node", "src/cobalt"]
