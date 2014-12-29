#!/bin/sh

prefix=$(dirname $0)
triton $prefix/test_service.js 2>&1 > /dev/null &


