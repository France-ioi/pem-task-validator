#!/bin/sh

EXPECTED_SIGNATURE="$(php -r "echo file_get_contents('https://composer.github.io/installer.sig');")"
echo $EXPECTED_SIGNATURE
php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
ACTUAL_SIGNATURE="$(php -r "echo hash_file('SHA384', 'composer-setup.php');")"

if [ "$EXPECTED_SIGNATURE" != "$ACTUAL_SIGNATURE" ]
then
    >&2 echo 'ERROR: Invalid installer signature'
    >&2 echo "  expected: $EXPECTED_SIGNATURE"
    >&2 echo "  actual  : $ACTUAL_SIGNATURE"
    rm composer-setup.php
    exit 1
fi

php composer-setup.php --quiet
RESULT=$?
rm composer-setup.php
exit $RESULT
