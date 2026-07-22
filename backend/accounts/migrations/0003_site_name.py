from django.db import migrations


def set_site(apps, schema_editor):
    Site = apps.get_model("sites", "Site")
    Site.objects.update_or_create(
        pk=1, defaults={"domain": "maisonlian.com", "name": "Maison Lián"}
    )


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_customerprofile_price_tier"),
        ("sites", "0002_alter_domain_unique"),
    ]
    operations = [migrations.RunPython(set_site, migrations.RunPython.noop)]
