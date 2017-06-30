#!/bin/dash

NODE=$(docker build -q -t node -f docker/Dockerfile-node .)
docker run --rm --tty --user $(id -u) --volume=$(pwd):/src $NODE \
	bower install

PHP=$(docker build -q -t php -f docker/Dockerfile-php .)
docker run --rm --tty --user $(id -u) --env HOME=/src --volume=$(pwd):/src $PHP \
  composer.phar install

