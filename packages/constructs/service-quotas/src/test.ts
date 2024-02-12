import { getCurrentQuotaValue } from './lambda/request-quota'

getCurrentQuotaValue('us-east-1', 'cloudfront', 'L-F432D044').then(console.log).catch(console.error)
