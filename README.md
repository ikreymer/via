via.hypothes.is
================

This project uses the live web rewriting and banner injection capabilities of [pywb web replay system](https://github.com/ikreymer/pywb) to automatically add [hypothes.is](https://hypothes.is) annotations to any web pages.

(Previously, to see Hypothesis annotations, the user has to manually install a plugin or enable the annotations via a bookmarklet).

This project is a demonstration of of using a web replay rewriting system for automatically showing annotations, which allows the annotations to (in theory) work on any modern browser.

Hosted at: https://via.hypothes.is/

Some examples:

[https://via.hypothes.is/http://hypothes.is/](https://via.hypothes.is/http://hypothes.is/)

[https://via.hypothes.is/http://www.autodidacts.io/openbci-brain-basics-neurons-structure-and-biology/](https://via.hypothes.is/http://www.autodidacts.io/openbci-brain-basics-neurons-structure-and-biology/)


### Running Via locally

#### With Docker

Via now includes a Dockerfile to be more easily deployed in Docker.

To build the container:
```
docker build -t hypothesis/via .
```

To run the container afterwards:
```
docker run --name via -d -p 9080:9080 hypothesis/via
```

This will start a container on the Docker host, mapped to port 9080.

To stop:

```
docker stop via
```

### Without Docker

You can also run Via locally without using Docker:

```py
make deps
make serve
```

When Via is running, you can access it locally at [localhost:9080](http://localhost:9080).

### Using a local Hypothesis service and client

Via serves the client from the URL specified via the `H_EMBED_URL` environment variable. To make Via use a local version of the client, or one served from a domain other than hypothes.is, set this variable before running the service.

In addition, you will also need to make sure that the host the client is being served from is listed under the `no_rewrite_prefixes` key in [config.yaml](config.yaml).

```sh
export H_EMBED_URL=http://localhost:5000/embed.js
make serve
```
