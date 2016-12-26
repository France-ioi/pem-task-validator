<?php

    require_once(dirname(__FILE__)."/vendor/autoload.php");

    use Namshi\JOSE\JWS;


    function return_json($data) {
        header('Content-Type: application/json');
        die(json_encode($data));
    }

    try {
        $jws = JWS::load($_REQUEST['token']);
    } catch(Exception $e) {
        return_json(array(
            'success' => false,
            'message' => $e->getMessage()
        ));
    }


    return_json(array(
        'success' => true,
        'payload' => $jws->getPayload()
    ));