import { getDocumentListStatusKey } from "../../domain/documents/documentListStatus.js";
import { buildDashboardChartModels } from "./buildDashboardChartModels.js";

export class GetAdminDashboardOverviewUseCase {
  constructor({
    adminDashboardRepository,
    subscriptionPlansRepository,
    usersRepository,
    organizationsRepository,
    documentsRepository,
    paymentsRepository,
    complaintsRepository,
  }) {
    this.adminDashboardRepository = adminDashboardRepository;
    this.subscriptionPlansRepository = subscriptionPlansRepository;
    this.usersRepository = usersRepository;
    this.organizationsRepository = organizationsRepository;
    this.documentsRepository = documentsRepository;
    this.paymentsRepository = paymentsRepository;
    this.complaintsRepository = complaintsRepository;
  }

  async execute() {
    const [
      aggregateCounts,
      plans,
      users,
      organizations,
      documentSample,
      paymentsSample,
      complaintsSample,
    ] = await Promise.all([
      this.adminDashboardRepository.getAggregateCounts(),
      this.subscriptionPlansRepository.listPlans(),
      this.usersRepository.listUsers({ pageSize: 120 }),
      this.organizationsRepository.listOrganizations({ pageSize: 80, withMembersCount: false }),
      this.documentsRepository.listDocuments({ pageSize: 80 }),
      this.paymentsRepository.listPayments({ pageSize: 250 }),
      this.complaintsRepository.listComplaints({ pageSize: 150 }),
    ]);

    const documentPipeline = { certified: 0, pending: 0, uploaded: 0, rejected: 0 };
    for (const doc of documentSample) {
      const key = getDocumentListStatusKey(doc);
      if (documentPipeline[key] !== undefined) documentPipeline[key] += 1;
      else documentPipeline.pending += 1;
    }

    const paidPayments = paymentsSample.filter((p) => String(p.status ?? "").toLowerCase() === "paid");
    const paidVolumeSample = paidPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const chartInputs = {
      aggregateCounts,
      plans,
      plansCount: plans.length,
      users,
      organizations,
      documents: documentSample,
      payments: paymentsSample,
      complaints: complaintsSample,
      documentPipelineCounts: documentPipeline,
    };

    const chartModels = buildDashboardChartModels({
      ...chartInputs,
      timelineDays: 30,
    });

    return {
      aggregateCounts,
      plans,
      plansCount: plans.length,
      recentUsers: users.slice(0, 5),
      recentOrganizations: organizations.slice(0, 5),
      recentDocuments: documentSample.slice(0, 5),
      recentPayments: paymentsSample.slice(0, 6),
      recentComplaints: complaintsSample.slice(0, 6),
      documentPipelineSample: {
        counts: documentPipeline,
        sampleSize: documentSample.length,
      },
      paymentsSampleMeta: {
        fetched: paymentsSample.length,
        paidVolumeSample,
      },
      chartInputs,
      chartModels,
    };
  }
}
