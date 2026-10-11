import useCustomerRequest from './use-customer-request';
import type { Request } from '../commerce/reviews';

/** Review API requests, sent as the signed-in customer when there is one. */
export default function useReviewRequest(): Request {
    return useCustomerRequest() as Request;
}
