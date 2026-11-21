"""Fatorial completo: 55 bandas × ordem (2, 4) × fase (zero, causal) × duração (20, 30 s) = 440 filtros."""
import os, sys, json, time, itertools; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from multiprocessing import Pool
from comum import RES
os.makedirs(os.path.join(RES, 'intermediarios'), exist_ok=True)

HPS = [None, .05, .1, .2, .3, .5, .7]; LPS = [.7, 1, 1.5, 2, 3, 5, 10, None]
BANDS = [(h, l) for h in HPS for l in LPS if not (h is not None and l is not None and h >= l)]
CFGS = [dict(h=h, l=l, order=o, zero_phase=z, det='linear', dur=d) for (h, l) in BANDS for o in (2, 4) for z in (True, False) for d in (30, 20)]

def run(cfg):
    from comum import trial_table, agg, crit
    A = agg(trial_table(cfg))
    c = crit(A); p = crit(A, inst='cop')
    clean = lambda D: {k: (None if (isinstance(v, float) and np.isnan(v)) else v) for k, v in D.items()}
    return dict(cfg=cfg, cel=clean(c), plat=clean(p))

if __name__ == '__main__':
    t0 = time.time()
    with Pool(2) as pool:
        out = []
        for i, r in enumerate(pool.imap(run, CFGS, chunksize=4)):
            out.append(r)
            if i % 40 == 0: print(i, round(time.time() - t0), 's', flush=True)
    json.dump(out, open(os.path.join(RES, 'intermediarios', 'fatorial.json'), 'w'))
    print('fim', len(out), round(time.time() - t0), 's')
