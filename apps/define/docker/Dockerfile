FROM python:3.13-slim
WORKDIR /opt/open-dict
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 && rm -rf /var/lib/apt/lists/*
COPY docker/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --require-hashes -r /tmp/requirements.txt
COPY index.html index.js dictionary.js manifest.webmanifest sw.js ./
COPY api api
COPY lexical lexical
COPY data data
COPY icons icons
COPY sounds sounds
USER 10001:10001
EXPOSE 8766
CMD ["python", "-m", "api.server", "--host", "0.0.0.0"]
