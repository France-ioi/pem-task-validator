<?php

require_once(dirname(__FILE__)."/vendor/autoload.php");

use Namshi\JOSE\JWS;

$params = $_POST['tokenParams'];
$privateKey = openssl_pkey_get_private($_POST['privateKey']);
$jws  = new JWS(array('alg' => 'RS512'));
error_log($params);
$params = json_decode($params, true);
$jws->setPayload($params);
$jws->sign($privateKey);
echo $jws->getTokenString();
