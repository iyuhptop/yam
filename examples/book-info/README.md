```bash
yam up --clusters dev,staging

yam apply --cluster dev --version v2 --dir reviews
yam apply --cluster dev --version v3 --dir reviews
```