import urllib.request, urllib.parse, json
try:
    data = urllib.parse.urlencode({'username': 'test@example.com', 'password': 'password123'}).encode()
    req = urllib.request.Request('http://localhost:8000/auth/login', data=data, headers={'Content-Type': 'application/x-www-form-urlencoded'}, method='POST')
    res = urllib.request.urlopen(req)
    token = json.loads(res.read())['access_token']
    
    req2 = urllib.request.Request('http://localhost:8000/chat/sessions', data=b'{"title": "Test"}', headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token}, method='POST')
    res2 = urllib.request.urlopen(req2)
    sess_id = json.loads(res2.read())['id']
    print("Created:", sess_id)
    
    req3 = urllib.request.Request('http://localhost:8000/chat/sessions/' + sess_id, data=b'{"title": "Renamed"}', headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token}, method='PATCH')
    res3 = urllib.request.urlopen(req3)
    print('PATCH SUCCESS:', res3.read())
except Exception as e:
    print('ERROR:', e)
    if hasattr(e, 'read'): print(e.read().decode())
