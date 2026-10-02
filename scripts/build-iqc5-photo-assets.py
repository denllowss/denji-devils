#!/usr/bin/env python3
"""Rebuild backdrop/menu/demo from the committed reference PNG, never emojis.
Build-time only: pip install pillow numpy opencv-python-headless
"""
from pathlib import Path
from PIL import Image,ImageFilter,ImageDraw
import numpy as np,cv2
ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'api/iqc5-assets'
im=Image.open(ASSETS/'reference.png').convert('RGB')
small=cv2.resize(np.array(im),(184,327),interpolation=cv2.INTER_AREA)
mask=np.zeros((327,184),np.uint8)
cv2.rectangle(mask,(4,110),(166,186),255,-1)
cv2.rectangle(mask,(5,184),(138,326),255,-1)
clean=cv2.inpaint(small,mask,8,cv2.INPAINT_TELEA)
Image.fromarray(clean).resize((736,1308),Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(7)).save(ASSETS/'backdrop.jpg',quality=95)
im.crop((33,754,545,1308)).save(ASSETS/'menu.png')
avatar=Image.new('RGB',(192,192),(128,62,117));paint=ImageDraw.Draw(avatar)
paint.ellipse((51,27,141,117),fill=(250,223,198));paint.ellipse((17,110,175,241),fill=(59,94,151))
paint.ellipse((53,26,139,69),fill=(46,27,25));paint.ellipse((77,69,83,75),fill=(46,27,25));paint.ellipse((109,69,115,75),fill=(46,27,25))
paint.arc((82,77,111,96),0,180,fill=(157,65,55),width=3)
avatar.save(ROOT/'public/images/iqc5-avatar-demo.png')
print('IQC5 photo assets ready; reference bytes and RGBA emojis unchanged.')
