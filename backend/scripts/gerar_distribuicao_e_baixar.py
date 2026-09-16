import json
import urllib.request
import urllib.error
import os
from math import floor

BASE_URL = "http://127.0.0.1:5001"


def post_json(path, data):
    url = BASE_URL + path
    b = json.dumps(data, ensure_ascii=False).encode('utf-8')
    req = urllib.request.Request(url, data=b, headers={
        'Content-Type':'application/json'
    }, method='POST')
    with urllib.request.urlopen(req, timeout=120) as resp:
        ct = resp.headers.get_content_type()
        body = resp.read()
        if ct == 'application/json':
            return json.loads(body.decode('utf-8'))
        return body

def main():

    bairros_map = {
        'MOGI DAS CRUZES': ['VILA OLIVEIRA','NOVA MOGILAR','ALTO DO IPIRANGA','PARQUE MONTE LIBANO','CENTRO','CEZAR DE SOUZA','BRAS CUBAS','JUNDIAPEBA','VILA MOGI MODERNO'],
        'SUZANO': ['CENTRO','PARQUE DO COLÉGIO','VILA AMORIM','JARDIM REALCE','CIDADE EDSON'],
        'GUARULHOS': ['VILA AUGUSTA','JARDIM MAIA','CENTRO','VILA GALVAO','MACEDO'],
        'POA': ['CENTRO','VILA MONTEIRO','JARDIM AUREA','JARDIM AMERICA','JARDIM NOVA POA'],
    }

    results = []
    for cidade, bairros in bairros_map.items():
        for bairro in bairros:
            payload = {'ufs':['SP'], 'cidades':[cidade], 'bairros':[bairro], 'quantidade': 999999}
            print('Requesting contagem for', cidade, '/', bairro)
            try:
                resp = post_json('/api/v1/consulta/contagem', payload)
                count = int(resp.get('total_disponivel', 0))
            except Exception as e:
                print('Error for', bairro, e)
                count = 0
            print(' ->', count)
            results.append({'cidade':cidade, 'bairro':bairro, 'disponivel':count})

    total = sum(r['disponivel'] for r in results)
    target = max(1, round(total * 1.1))
    print('Total available:', total, 'Target (+10%):', target)

    alloc = []
    if total == 0:
        for r in results:
            alloc.append({**r, 'quantidade': 0})
    else:
        # proportional allocation with minimum 1 for non-zero availability
        provisional = []
        sum_alloc = 0
        for r in results:
            if r['disponivel'] <= 0:
                q = 0
                frac = 0
            else:
                prop = r['disponivel'] / total
                exact = prop * target
                q = int(floor(exact))
                if q < 1:
                    q = 1
                frac = exact - floor(exact)
            provisional.append((r, q, frac))
            sum_alloc += q
        remainder = target - sum_alloc
        # distribute remainder to highest fractional parts
        provisional.sort(key=lambda x: x[2], reverse=True)
        i = 0
        while remainder > 0 and i < len(provisional):
            if provisional[i][0]['disponivel'] > 0:
                provisional[i] = (provisional[i][0], provisional[i][1]+1, provisional[i][2])
                remainder -= 1
            i += 1
            if i >= len(provisional):
                i = 0
        alloc = [{'cidade':p[0]['cidade'], 'bairros':[p[0]['bairro']], 'disponivel':p[0]['disponivel'], 'quantidade':p[1]} for p in provisional]

    # save allocation CSV
    out_dir = os.path.join('backend','output','temp')
    os.makedirs(out_dir, exist_ok=True)
    csv_path = os.path.join(out_dir, 'allocacao_bairros.csv')
    with open(csv_path, 'w', encoding='utf-8') as f:
        f.write('cidade,bairro,disponivel,quantidade\n')
        for a in alloc:
            f.write(f"{a['cidade']},{a['bairros'][0]},{a['disponivel']},{a['quantidade']}\n")
    print('Allocation saved to', csv_path)

    # build payload for download
    dist = []
    for a in alloc:
        if a['quantidade'] > 0:
            dist.append({'cidade': a['cidade'], 'bairros': a['bairros'], 'quantidade': a['quantidade']})

    payload = {'ufs':['SP'], 'distribuicao': dist, 'quantidade': target}
    print('Requesting download with payload, items:', len(dist))
    try:
        data = post_json('/api/v1/consulta/download', payload)
        # if returned bytes, save
        if isinstance(data, bytes):
            xlsx_path = os.path.join(out_dir, 'lista_gerada.xlsx')
            with open(xlsx_path, 'wb') as f:
                f.write(data)
            print('Downloaded xlsx to', xlsx_path)
        else:
            print('Download response:', data)
    except Exception as e:
        print('Download failed:', e)

if __name__ == '__main__':
    main()
